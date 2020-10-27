import os
import sys
import srt
import pickle
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

        KEYWORDS_FILE = os.path.join(CURRENT_PATH, f'./src/keywords_{VIDEO_ID}.txt')
        OPTIONES_FILE = os.path.join(CURRENT_PATH, f'./src/options_{VIDEO_ID}.txt')

# [Step 1] Read file
subtitleFile = os.path.join(SOURCE_DIR, f'{VIDEO_ID}/{VIDEO_ID}.ko.srt')
file = open(subtitleFile)
del subtitleFile

# [Step 2] Parse '.srt' and general subtitles
srtFile = srt.parse(file)
subtitles = list(srtFile)

# [Step 4.1] Create kiwipy
machine = Kiwi()
# [Step 4.2] Load custom dictionary
machine.load_user_dictionary(DICTIONARY_PATH)
# [Step 4.3] Prepare machine
machine.prepare()

# [Step 5] Load analyzed data
file = open(OPTIONES_FILE, 'rb')
finalData = pickle.load(file)
del file

# [Step 6.1] Check output directory existence
outputDir = f'{SOURCE_DIR}{VIDEO_ID}/frames/'
if (os.path.isdir(outputDir) == False):
    os.mkdir(outputDir)
# [Step 6.2] Generate args to extract frame
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
# [Step 6.3] Create subProcess for Processing
result = subprocess.call(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
exit(result)