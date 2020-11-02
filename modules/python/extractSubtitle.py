import re
import srt

from kiwipiepy import Kiwi
from IOHandler import IOHandler
from Subtitle import Subtitle

def extractSubtitle(path):
    # 형태소 분석을 위해 Kiwipiepy 생성
    kiwi = Kiwi()
    kiwi.prepare()

    srtData = None
    # 파일 읽기
    with open(path, 'r') as file:
        # SRT 파일 Parse
        srtGen = srt.parse(file)
        srtData = list(srtGen)
    
    temp = []
    subtitles = []
    for elem in srtData:
        # 줄바꿈 문자 제거
        elem.content = elem.content.replace("\n", " ")
        # kiwi를 이용하여 자막 문장 분석
        result = kiwi.analyze(elem.content)
        # 문장 분석 결과에서 종결어미 추출
        endings = [elem for elem in (result[0])[0] if elem[1] == "EF"]

        # 문장에 종결어미 포함 여부 확인
        if len(endings) > 0:
            # 종결 어미를 포함시킨 문자열만큼 잘라내기 위해서 Index 추출
            index = endings[0][2] + endings[0][3]
            # 자막 문장에서 종결어미를 기준으로 문자열 자르기
            substr1 = elem.content[:index].strip()
            substr2 = elem.content[index:].strip()
            # 잘려진 뒷 문자열에 .,?! 등 기호를 제외한 다른 문자가 있는지 확인하기 위한 정규식
            regex = re.compile(r'[가-힣]+|\w+')
            # 잘려진 뒷 문자열에 다른 모든 문자가 있는지 확인 (새로운 문장의 시작 여부를 알기 위해)
            match = regex.search(substr2)
            if match != None and match.start() != 0:
                # 잘려진 뒷 문자열에 .,?! 등 기호를 제외한 다른 문자가 있다면 해당 인덱스를 기준으로 문자열 자르기
                substr1 += substr2[:match.start()].strip()
                substr2 = substr2[match.start():].strip()
            elif match == None and len(substr2) > 0:
                # 잘려진 뒷 문자열에 .,?! 등 기호를 제외한 다른 문자가 없다면 기존 문자열에 다시 붙이기 (종결어미에는 .,?! 등과 같은 기호가 붙지 않기 때문에 이전 문장에 해당 기호들을 붙이기 위해서 해당 코드들 수행)
                substr1 += substr2
                substr2 = ""
            # 종결어미를 기준으로 잘려진 문장과 자막 정보를 temp list에 임시로 저장
            temp.append(Subtitle(elem.start, elem.end, substr1))
            # temp list에 저장된 문장들 결합
            contents = list(map(lambda x: x.content, temp))
            sentence = " ".join(contents)
            # 결합된 문장과 temp list 에 자막 정보를 이용하여 새로운 자막(1줄) 정보를 가진 dictionary 생성
            sentObj = Subtitle((temp[0]).start, (temp[len(temp) - 1]).end, sentence)
            # temp list 초기화
            temp.clear()
            # 잘려진 뒷 문자열에 공백이 아닌 문자가 있을 경우, 저장
            if substr2 != "":
                temp.append(Subtitle(elem.start, elem.end, substr2))
            # 새롭게 생성한 자막(1줄) 정보를 저장
            subtitles.append(sentObj)
        else:
            # 자막에 종결 어미가 없을 경우, 다은 자막 문장과 연결될 수 있기 때문에 temp 리스트에 해당 자막 문장 정보를 저장
            temp.append(Subtitle(elem.start, elem.end,  elem.content))

    if len(temp) > 0:
        # temp list에 저장된 문장들 결합
        contents = list(map(lambda x: x.content, temp))
        sentence = " ".join(contents)
        # 결합된 문장과 temp list 에 자막 정보를 이용하여 새로운 자막(1줄) 정보를 가진 dictionary 생성
        sentObj = Subtitle((temp[0]).start, (temp[len(temp) - 1]).end, sentence)

    del srtData
    del temp

    return subtitles