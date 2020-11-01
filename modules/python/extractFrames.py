import os
import sys
import srt
import json
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
        ## set temp file path
        TEMP_FILE = os.path.join(CURRENT_PATH, f'./src/temp_{VIDEO_ID}.txt')
        ## set options and keywords file path
        dataDirPath = os.path.join(SOURCE_DIR, f'{VIDEO_ID}/data/')
        if os.path.isdir(dataDirPath) == False:
            exit(4)
        else:
            KEYWORDS_FILE = os.path.join(dataDirPath, f'./keywords_{VIDEO_ID}.json')
            OPTIONES_FILE = os.path.join(dataDirPath, f'./options_{VIDEO_ID}.json')
        del dataDirPath

# [Step 1] Read file
# subtitleFile = os.path.join(SOURCE_DIR, f'{VIDEO_ID}/{VIDEO_ID}.ko.srt')
# file = open(subtitleFile)

# [Step 2] Parse '.srt' and general subtitles
# srtFile = srt.parse(file)
# subtitles = list(srtFile)
# file.close()
# del subtitleFile
# del file

# [Step 4.1] Create kiwipy
machine = Kiwi()
# [Step 4.2] Load custom dictionary
machine.load_user_dictionary(DICTIONARY_PATH)
# [Step 4.3] Prepare machine
machine.prepare()

# [Step 5] Load analyzed data
with open(OPTIONES_FILE, 'r', encoding='utf-8') as file:
    finalData = json.load(file)
del file

# [Step 6.1] Check output directory existence
outputDir = f'{SOURCE_DIR}{VIDEO_ID}/frames/'
if (os.path.isdir(outputDir) == False):
    os.mkdir(outputDir)
# [Step 6.2] Generate args to extract frame
source = f'{SOURCE_DIR}{VIDEO_ID}/{VIDEO_ID}{EXTENSION}'
output = f'{outputDir}frame_%d.png'
## generate filter agrs
filterArgs = 'select='
for i, elem in enumerate(finalData):
    fI = elem['frameIndex']
    filterArgs += f"'eq(n,{fI})'"
    if i < len(finalData) - 1:
        filterArgs += '+'
## generate args to be used in ffmpeg
args = ['ffmpeg', '-y', '-i', source, '-vf', filterArgs, '-vcodec', 'png', '-vsync', '0', output]
# [Step 6.3] Create subProcess for Processing
result = subprocess.call(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
exit(result)