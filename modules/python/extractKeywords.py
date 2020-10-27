import os
import sys
import srt
import pickle

from kiwipiepy import Kiwi
from IOHandler import IOHandler
## pos list
POS_LIST = ["NNG", "NR"]
## current work path (/modules/python)
CURRENT_PATH = os.getcwd()
## etc path
SOURCE_DIR = os.path.join(CURRENT_PATH, "../../public/dist/videos/")
DICTIONARY_PATH = os.path.join(CURRENT_PATH, "./src/customDictionary.txt")
TEMP_FILE = None
KEYWORDS_FILE = None
OPTIONES_FILE = None
## videoID and extension
VIDEO_ID = None
EXTENSION = None

# [Step 0] check argv
if len(sys.argv) != 2:
    exit(2)
else:
    idx = sys.argv[1].rfind('.')
    if (idx == -1):
        exit(3)
    else:
        VIDEO_ID = sys.argv[1][:idx]
        EXTENSION = sys.argv[1][idx:]

        TEMP_FILE = os.path.join(CURRENT_PATH, f'./src/temp_{VIDEO_ID}.txt')
        KEYWORDS_FILE = os.path.join(CURRENT_PATH, f'./src/keywords_{VIDEO_ID}.txt')
        OPTIONES_FILE = os.path.join(CURRENT_PATH, f'./src/options_{VIDEO_ID}.txt')

# [Step 1] Read file
subtitleFile = os.path.join(SOURCE_DIR, f'{VIDEO_ID}/{VIDEO_ID}.ko.srt')
file = open(subtitleFile)
del subtitleFile

# [Step 2] Parse '.srt' and general subtitles
srtFile = srt.parse(file)
subtitles = list(srtFile)
del file

# [Step 3.1] Create temp file
file = open(TEMP_FILE, 'w')
# [Step 3.2] Extract sentences and save sentences in temp file
sentences = []
for elem in subtitles:
    sentences.append(elem.content)
    file.write(elem.content)
file.close()
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
file = open(KEYWORDS_FILE, 'wb')
pickle.dump(keywords, file)
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
    time = (sentence.end - sentence.start) * 0.9 + sentence.start
    analyzedSentences.append({'index': sentence.index, 'frameIndex': round((time.seconds + (time.microseconds / 1000000)) * 30), 'time': time,  'score': score})
# [Step 6.2] sort Analyzed data
sortedAnalyzedSentences = sorted(analyzedSentences, key=lambda x: x['score'], reverse=True)
# [Step 6.3] Extract analyzed data (total sentences count 50%)
end = round((len(subtitles) * 50))
finalData = sortedAnalyzedSentences[:end]
## clear variable
del end
del analyzedSentences
del subtitles
del machine
del keywords
# [Step 6.4] Save analyzed data
file = open(OPTIONES_FILE, 'wb')
pickle.dump(finalData, file)
del file

# Exit
exit(0)