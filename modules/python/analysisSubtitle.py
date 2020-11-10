import os
import sys
import json

from kiwipiepy import Kiwi
from IOHandler import IOHandler
from Preprocessing import Preprocessing

## POS List
POS_LIST = ["NNG", "NR"]
## Current work directory path (/modules/python)
CURRENT_PATH = os.getcwd()
## Various directory path
DIR_WORKSPACE = None
DIR_DISTINATION = None
## Various file path
FILE_TEMP = None
FILE_KEYWORDS = None
FILE_OPTIONS = None
## Various value for processing
VAL_VIDEO_ID = None
VAL_PROC_INDEX = None
## 폴더 존재 여부 확인 함수 (없을 경우, 생성)
def checkDir(path):
    try:
        if os.path.isdir(path) == False:
            os.mkdir(path)
        return True
    except Exception as err:
        print(f"[PYTHON ERROR] {err}")
        return False

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
    else:
        print("[PYTHON ERROR] arguments does not match.")
        exit(2)
    ## Workspace 경로 설정 (다운받은 영상 및 자막이 존재하는 폴더)
    DIR_WORKSPACE = os.path.join(CURRENT_PATH, "../../public/workspace", f"{VAL_PROC_INDEX}_{VAL_VIDEO_ID}")
    ## 처리 결과(추출된 키워드 및 자막 정보)를 저장하기 위한 각종 폴더 존재 여부 확인 및 생성
    DIR_DISTINATION = os.path.join(CURRENT_PATH, "../../public/dist/")
    if checkDir(DIR_DISTINATION) == False:
        exit(3)
    DIR_DATA = os.path.join(DIR_DISTINATION, f"{VAL_VIDEO_ID}")
    if checkDir(DIR_DATA) == False:
        exit(3)
    DIR_DATA = os.path.join(DIR_DATA, f"{VAL_PROC_INDEX}")
    if checkDir(DIR_DATA) == False:
        exit(3)
    DIR_DATA = os.path.join(DIR_DATA, "data")
    if checkDir(DIR_DATA) == False:
        exit(3)
    ## 처리 과정에서 발생하는 데이터를 임시로 저장하기 위한 Temp 파일 경로 설정
    FILE_TEMP = os.path.join(DIR_WORKSPACE, f"temp_{VAL_PROC_INDEX}_{VAL_VIDEO_ID}.txt")
    ## 추출된 키워드를 저장하기 위한 파일 경로 설정
    FILE_KEYWORDS = os.path.join(DIR_DATA, "keywords.json")
    ## 가공된 자막 데이터를 저장하기 위한 파일 경로 설정
    FILE_OPTIONS = os.path.join(DIR_DATA, "processed.json")
    ## 변수 제거
    del index
    del DIR_DATA

# [Step 2.1] 자막 파일 경로 설정 (.srt)
subtitlePath = os.path.join(DIR_WORKSPACE, f"{VAL_VIDEO_ID}.ko.srt")
# [Step 2.2] 자막 파일 읽기
preprocessing = Preprocessing()
result = preprocessing.read(subtitlePath)
if result == False:
    print("[PYTHON ERROR] Failed read file")
    exit(4)
# [Step 2.3] 읽어온 자막 파일을 이용하여 전처리
result = preprocessing.processingSubtitle()
if result == False:
    print("[PYTHON ERROR] Failed preprocessing subtitle")
    exit(4)
del subtitlePath
del result

# [Step 3] 가공된 자막에서 문장을 가져오고 분석을 위해 temp 파일에 저장
with open(FILE_TEMP, 'w') as file:
    for elem in preprocessing.subtitles:
        file.write(elem.content)

# [Step 4.1] 형태소 분석기 생성
machine = Kiwi()
# [Step 4.2] 사용자 지정 사전 파일 존재 여부 확인 및 생성
FILE_DICTIONARY = os.path.join(CURRENT_PATH, "./src/customDictionary.txt")
if os.path.isfile(FILE_DICTIONARY) == False:
    file = open(FILE_DICTIONARY, 'w')
    file.close()
# [Step 4.3] 사용자 지정 사전 불러오기
machine.load_user_dictionary(FILE_DICTIONARY)
# [Step 4.4] temp파일(자막의 문장들이 저장되어 있는 파일)로부터 새로운 단어 추출 및 사용자 지정 사전에 추가
tempFile = IOHandler(FILE_TEMP, 'r')
dictionary = open(FILE_DICTIONARY, 'a')
words = machine.extract_add_words(tempFile.read, 6)
## 추출된 새로운 단어를 사용자 지정 사전에 형식(단어\t품사\n) 에 맞춰 저장
for elem in words:
    dictionary.write(f"{elem[0]}\t{elem[1]}\n")
## 참조 해제
dictionary.close()
tempFile.delete()
del words
del tempFile
del dictionary
## 사용을 마친 temp 파일 삭제
os.remove(FILE_TEMP)

# [Step 5.1] 분석을 위한 형태소 분석기 준비
machine.prepare()
# [Step 5.2] 문장 분석 (키워드 추출을 위한 단어 추출)
nouns = {}
result = machine.analyze(preprocessing.getSubtitleContents())
for elem in (result[0])[0]:
    ## 분석을 통해 나온 단어가 명사인 경우에만 키워드 추출을 위해 저장
    if elem[1] in POS_LIST and len(elem[0]) > 1:
        if elem[0] not in nouns.keys():
            nouns[elem[0]] = 1
        else:
            nouns[elem[0]] += 1
# [Step 5.3] 추출된 명사들에 대해 빈도를 기준으로 내림차순 정렬
sortedWords = sorted(nouns.items(), key=lambda x: x[1], reverse=True)
## 참조 해제
del nouns
del result
# [Step 5.4] 정렬된 명사 리스트로부터 키워드 추출 (상위 100개)
end = len(sortedWords) if len(sortedWords) < 100 else 100
keywords = dict(sortedWords[:end])
# [Step 5.5] 추출된 키워드 저장
with open(FILE_KEYWORDS, 'w', encoding="utf-8") as file:
    json.dump(keywords, file, ensure_ascii=False)
## 참조 해제
del end
del sortedWords

# [Step 6.1] 추출된 키워드를 이용하여 자막 문장에 대한 점수화
analyzedSentences = []
for sent in preprocessing.subtitles:
    ## 문장 분석
    result = machine.analyze(sent.content)
    ## 키워드를 이용하여 문장에 대한 점수화
    score = 0
    for elem in (result[0])[0]:
        if elem[1] in POS_LIST and elem[0] in keywords.keys():
            score += keywords[elem[0]]
    ## 점수를 추가한 자막 데이터 가공
    time = (sent.end - sent.start) * 0.8 + sent.start
    analyzedSentences.append({'frameIndex': round((time.seconds + (time.microseconds / 1000000)) * 30), 'start': str(sent.start), 'end': str(sent.end), 'time': str(time), 'score': score, 'sentence': sent.content, 'extract': 'false'})
# [Step 6.2] 점수를 기준으로 내림차순 정렬
sortedAnalyzedSentences = sorted(analyzedSentences, key=lambda x: x['score'], reverse=True)
# [Step 6.3] 정렬된 자막 데이터에서 상위 75퍼만 프레임으로 추출하기 위해 설정
count = round(len(sortedAnalyzedSentences) * 0.75)
for i in range(0, count):
    sortedAnalyzedSentences[i]['extract'] = 'true'
# [Step 6.4] Frame index를 기준으로 오름차순 정렬
sortedFinalData = sorted(sortedAnalyzedSentences, key=lambda x: x['frameIndex'])
## 참조 해제
del analyzedSentences
del count
# [Step 6.5] 가공된 자막 데이터 저장
with open(FILE_OPTIONS, 'w', encoding="utf-8") as file:
    json.dump(sortedFinalData, file, ensure_ascii=False)

# Exit
exit(0)