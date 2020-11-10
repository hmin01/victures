import os
import sys
import json
import subprocess

## Current work directory path (/modules/python)
CURRENT_PATH = os.getcwd()
## Various directory path
DIR_WORKSPACE = None
DIR_DISTINATION = None
## Various file path
FILE_PROCESSED = None
## Various value for processing
VAL_VIDEO_ID = None
VAL_VIDEO_EXT = None
VAL_PROC_INDEX = None

# [Step 1] Check arguments
## 인자를 이용하여 처리를 위한 경로 및 값을 설정
if len(sys.argv) != 3:
    print("[PYTHON ERROR] The number of arguments does not match.")
    exit(2)
else:
    ## 전달 받은 인자(중복된 비디오 처리를 위한 PINDEX)에서 값 추출
    VAL_PROC_INDEX = sys.argv[1]
    ## 전달 받은 인자(확장자를 포함한 비디오 파일)에서 VIDEO ID 추출
    index = sys.argv[2].rfind('.')
    if index != -1:
        VAL_VIDEO_ID = sys.argv[2][:index]
        VAL_VIDEO_EXT = sys.argv[2][index:]
    else:
        print("[PYTHON ERROR] arguments does not match.")
        exit(2)
    ## Workspace 경로 설정 (다운받은 영상 및 자막이 존재하는 폴더)
    DIR_WORKSPACE = os.path.join(CURRENT_PATH, "../../public/workspace", f"{VAL_PROC_INDEX}_{VAL_VIDEO_ID}")
    ## 처리 결과(추출된 키워드 및 자막 정보)를 저장하기 위한 각종 폴더 존재 여부 확인 및 생성
    DIR_DISTINATION = os.path.join(CURRENT_PATH, "../../public/dist/")
    if os.path.isdir(DIR_DISTINATION) == False:
        exit(3)
    DIR_DISTINATION = os.path.join(DIR_DISTINATION, f"{VAL_VIDEO_ID}")
    if os.path.isdir(DIR_DISTINATION) == False:
        exit(3)
    DIR_DISTINATION = os.path.join(DIR_DISTINATION, f"{VAL_PROC_INDEX}")
    if os.path.isdir(DIR_DISTINATION) == False:
        exit(3)
    if os.path.isdir(os.path.join(DIR_DISTINATION, "data")) == False:
        exit(3)
    ## 가공된 자막 데이터가 저장된 파일 경로 설정
    FILE_PROCESSED = os.path.join(DIR_DISTINATION, "data", "processed.json")
    ## 변수 제거
    del index

# [Step 2] 가공된 자막 데이터 불러오기
sentData = None
try:
    with open(FILE_PROCESSED, 'r', encoding="utf-8") as file:
        sentData = json.load(file)
except Exception as err:
    print(f"[PYTHON ERROR] {err}")
    exit(3)

# [Step 3.1] 추출된 프레임을 저장하기 위한 frames 폴더 생성
DIR_OUTPUT = os.path.join(DIR_DISTINATION, "frames")
if os.path.isdir(DIR_OUTPUT) == False:
    os.mkdir(DIR_OUTPUT)
# [Step 3.2] 프레임 추출을 위한 파라미터 값 생성
FILE_SRC = os.path.join(DIR_WORKSPACE, f"{VAL_VIDEO_ID}{VAL_VIDEO_EXT}")
FILE_OUT = f"{DIR_OUTPUT}/frame_%d.png"
## vfilter 생성
filterArgs = 'select='
for i, elem in enumerate(sentData):
    if elem.extract == 'false':
        continue

    fI = elem["frameIndex"]
    filterArgs += f"'eq(n,{fI})'"
    if i < len(sentData) - 1:
        filterArgs += "+"
## ffmpeg 옵션 생성
args = ['ffmpeg', '-y', '-i', FILE_SRC, '-vf', filterArgs, '-vcodec', 'png', '-vsync', '0', FILE_OUT]
# [Step 3.3] FFMPEG 실행
result = subprocess.call(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

# Exit
exit(result)