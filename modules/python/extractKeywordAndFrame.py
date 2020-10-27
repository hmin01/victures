import os
import sys
import srt
import math
import subprocess

from kiwipiepy import Kiwi
from IOHandler import IOHandler
## pos list
POS_LIST = ["NNG", "NR"]
## current work path (/modules/python)
CURRENT_PATH = os.getcwd()
## etc path
SOURCE_DIR = os.path.join(CURRENT_PATH, "../../public/dist/videos/")
DICTIONARY_PATH = os.path.join(CURRENT_PATH, "./src/customDictionary.txt")
FILE_PATH = os.path.join(CURRENT_PATH, "./src/temp.txt")
## videoID and extension
VIDEO_ID = None
EXTENSION = None

# [Step 0] check argv
if len(sys.argv) != 2:
    exit(3)
else:
    idx = sys.argv[1].rfind('.')
    if (idx == -1):
        exit(4)
    else:
        VIDEO_ID = sys.argv[1][:idx]
        EXTENSION = sys.argv[1][idx:]

# [Step 1] Read file
subtitleFile = os.path.join(SOURCE_DIR, f'{VIDEO_ID}/{VIDEO_ID}.ko.srt')
file = open(subtitleFile)
del subtitleFile

# [Step 2] Parse '.srt' and general subtitles
srtFile = srt.parse(file)
subtitles = list(srtFile)

# [Step 3.1] Create temp file
file = open(FILE_PATH, 'w')
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
file = IOHandler(FILE_PATH, 'r')
# [Step 4.4] Open custom dictionary file
dictionary = open(DICTIONARY_PATH, 'a')
# [Step 4.5] Extract words
words = machine.extract_add_words(file.read, 8)
for elem in words:
    dictionary.write(f'{elem[0]}\tNNG\n')
dictionary.close()
del words

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
    time = (sentence.end - sentence.start) * 0.95 + sentence.start
    analyzedSentences.append({'index': sentence.index, 'frameIndex': round((time.seconds + (time.microseconds / 1000000)) * 30), 'time': time,  'score': score})
# [Step 6.2] sort Analyzed data
sortedAnalyzedSentences = sorted(analyzedSentences, key=lambda x: x['score'], reverse=True)
# [Step 6.3] Extract analyzed data (total sentences count 50%)
end = round((len(subtitles) / 2))
finalData = sortedAnalyzedSentences[:end]
## clear variable
del end
del keywords
del analyzedSentences
del subtitles

# [Step 7.1] Check output directory existence
outputDir = f'{SOURCE_DIR}{VIDEO_ID}/frames/'
if (os.path.isdir(outputDir) == False):
    os.mkdir(outputDir)
# [Step 7.2] Generate args to extract frame
source = f'{SOURCE_DIR}{VIDEO_ID}/{VIDEO_ID}{EXTENSION}'
output = f'{outputDir}frame_%d.png'
## sort by asc
sortedFinalData = sorted(finalData, key=lambda x: x['frameIndex'])
## generate filter agrs
filterArgs = 'select='
for i, elem in enumerate(sortedFinalData):
    fI = elem['frameIndex']
    filterArgs += f"'eq(n,{fI})'"
    if i < len(finalData) - 1:
        filterArgs += '+'
## generate args to be used in ffmpeg
args = ['ffmpeg', '-y', '-i', source, '-vf', filterArgs, '-vcodec', 'png', '-vsync', '0', output]
# [Step 7.3] Create subProcess for Processing
result = subprocess.call(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
exit(result)