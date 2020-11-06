import os
import sys
import srt
import json

from kiwipiepy import Kiwi
from IOHandler import IOHandler
from extractSubtitle import extractSubtitle

## pos list
POS_LIST = ["NNG", "NR"]
## current work path (/modules/python)
CURRENT_PATH = os.getcwd()
## etc path
WORKSPACE_DIR = None
SOURCE_DIR = os.path.join(CURRENT_PATH, '../../public/dist/')
DICTIONARY_PATH = os.path.join(CURRENT_PATH, './src/customDictionary.txt')
TEMP_FILE = None
KEYWORDS_FILE = None
OPTIONES_FILE = None
## videoID and extension
VIDEO_ID = None
PROCESS_INDEX = None
EXTENSION = None

# [Step 0] check argv
if len(sys.argv) != 3:
    exit(2)
else:
    idx = sys.argv[2].rfind('.')
    if (idx == -1):
        exit(3)
    else:
        PROCESS_INDEX = sys.argv[1]
        VIDEO_ID = sys.argv[2][:idx]
        EXTENSION = sys.argv[2][idx:]
        ## set workspace
        WORKSPACE_DIR = os.path.join(CURRENT_PATH, '../../public/workspace/', f'{PROCESS_INDEX}_{VIDEO_ID}/')
        ## set temp file path
        TEMP_FILE = os.path.join(WORKSPACE_DIR, f'temp_{PROCESS_INDEX}_{VIDEO_ID}.txt')
        ## 데이터 정보를 저장하는 기본 폴더 존재 여부 및 생성
        baseDirPath = os.path.join(SOURCE_DIR)
        if os.path.isdir(baseDirPath) == False:
            os.mkdir(baseDirPath)
        ## set options and keywords file path
        versionDirPath = os.path.join(SOURCE_DIR, f'{VIDEO_ID}/{PROCESS_INDEX}')
        if os.path.isdir(versionDirPath) == False:
            os.mkdir(versionDirPath)
        dataDirPath = os.path.join(versionDirPath, 'data')
        if os.path.isdir(dataDirPath) == False:
            os.mkdir(dataDirPath)

        KEYWORDS_FILE = os.path.join(dataDirPath, f'./keywords_{VIDEO_ID}.json')
        OPTIONES_FILE = os.path.join(dataDirPath, f'./options_{VIDEO_ID}.json')
        del dataDirPath

# [Step 1] Read file
subtitleFile = os.path.join(WORKSPACE_DIR, f'{VIDEO_ID}.ko.srt')

# [Step 2] Parse '.srt' and general subtitles
subtitles = extractSubtitle(subtitleFile)
del subtitleFile

# [Step 3] Extract sentences and save sentences in temp file
sentences = []
with open(TEMP_FILE, 'w') as file:
    for elem in subtitles:
        sentences.append(elem.content)
        file.write(elem.content)
del file

# [Step 4.1] Create kiwipy
machine = Kiwi()
# [Step 4.2.1] If not exist, create file
if os.path.isfile(DICTIONARY_PATH) == False:
    file = open(DICTIONARY_PATH, 'w')
    file.close()
    del file
# [Step 4.2.2] Load custom dictionary
machine.load_user_dictionary(DICTIONARY_PATH)
# [Step 4.3] Read sentence file
file = IOHandler(TEMP_FILE, 'r')
# [Step 4.4] Open custom dictionary file
dictionary = open(DICTIONARY_PATH, 'a')
# [Step 4.5] Extract words
words = machine.extract_add_words(file.read, 8)
for elem in words:
    dictionary.write(f'{elem[0]}\tNNG\n')
dictionary.close()
file.file.close()
del words
del file
# [Step 4.6] Delete temp file
os.remove(TEMP_FILE)

# [Step 5.1] Prepare machine
machine.prepare()
# [Step 5.2] Analysis words (extract nouns)
nouns = {}
result = machine.analyze('\t'.join(sentences))
words = (result[0])[0]
for elem in words:
    ## In case of nouns, add word in list
    if elem[1] in POS_LIST and len(elem[0]) > 1:
        ## If not exist word in nouns
        if elem[0] not in nouns.keys():
            nouns[elem[0]] = 1
        else:
            nouns[elem[0]] += 1

# [Step 5.3.1] Sort word by frequency
sortedWords = sorted(nouns.items(), key=lambda x:x[1], reverse=True)
## clear variable
del nouns
del result
del words
# [Step 5.4] Extract keyword (top 100 word)
## frequence = score
end = len(sortedWords) if len(sortedWords) < 100 else 100
## convert list to dictionary
keywords = dict(sortedWords[:end])
## clear variable
del end
del sortedWords
# [Step 5.5] Save keywords and analysis data
with open(KEYWORDS_FILE, 'w', encoding='utf-8') as file:
    json.dump(keywords, file, ensure_ascii=False)
del file

# [Step 6.1] Analysis subtitls
analyzedSentences = []
for sentence in subtitles:
    ## analysis
    result = machine.analyze(sentence.content)
    ## extract words
    words = (result[0])[0]
    ## calculate sentence score
    score = 0
    for elem in words:
        if elem[1] in POS_LIST and elem[0] in keywords.keys():
            score += keywords[elem[0]]
    ## save analysis result
    time = (sentence.end - sentence.start) * 0.8 + sentence.start
    analyzedSentences.append({'frameIndex': round((time.seconds + (time.microseconds / 1000000)) * 30), 'start': str(sentence.start), 'end': str(sentence.end), 'time': str(time), 'score': score, 'sentence': sentence.content})
# [Step 6.2] sort Analyzed data
sortedAnalyzedSentences = sorted(analyzedSentences, key=lambda x: x['score'], reverse=True)
# [Step 6.3] Extract analyzed data (total sentences count 50%)
end = round((len(subtitles) * 0.5))
finalData = sortedAnalyzedSentences[:end]
# [Step 6.4] Sort by timestamp
sortedFinalData = sorted(finalData, key=lambda x: x['frameIndex'])
## clear variable
del end
del analyzedSentences
del subtitles
del machine
del keywords
del finalData
# [Step 6.4] Save analyzed data
with open(OPTIONES_FILE, 'w', encoding='utf-8') as file:
    json.dump(sortedFinalData, file, ensure_ascii=False)
del file

# Exit
exit(0)