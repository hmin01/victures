import re
import os
import srt

from kiwipiepy import Kiwi
from IOHandler import IOHandler
from Subtitle import Subtitle

# Preprocessing class
class Preprocessing:
    def __init__(self):
        self.__srtData = None
        self.__sentences = None
        self.subtitles = None
        ## Kiwipie 형태소 분석기 생성 및 준비
        self.__kiwi = Kiwi()
        self.__kiwi.prepare()
    
    def read(self, path):
        try:
            ## File 존재 여부 확인
            if not os.path.isfile(path):
                return False
            ## 확장자 존재 여부 확인
            extensionIndex = path.rfind('.')
            if extensionIndex == -1:
                print("Not found extension")
                return False
            else:
                ## 확장자 .srt 여부 확인 및 파일 읽기
                extension = path[(extensionIndex+1):]
                if extension == "srt":
                    with open(path, 'r', encoding="utf-8") as file:
                        srtGen = srt.parse(file)
                        self.__srtData = list(srtGen)
                    return True
                else:
                    return False
        except Exception as err:
            print(err)
            return False

    def processingSentences(self):
        try:
            ## 전체 문장을 하나로 합치기
            contents = []
            for line in self.__srtData:
                ### 줄바꿈 기호 및 문장 앞뒤 공백 제거
                line.content = line.content.replace("\n", " ")
                line.content = line.content.strip()
                ### 문장 추가
                contents.append(line.content)
            totalContent = " ".join(contents)

            ## 종결어미를 기준으로 문장을 나눔
            ### kiwipie 형태소 분석기를 이용하여 종결어미 추출
            result = self.__kiwi.analyze(totalContent)
            endings = [elem for elem in (result[0])[0] if elem[1] == "EF"]
            ### 종결어미를 기준으로 문장 나누기
            contents.clear()
            offset = 0
            for elem in endings:
                index = elem[2] + elem[3]
                preSentence = totalContent[offset:index]
                nextSentence = totalContent[index:]
                ### 잘려진 뒷 문자열에 .,?! 등 기호를 제외한 다른 문자가 있는지 확인하기 위한 정규식
                regex = re.compile(r'[가-힣]+|\w+')
                match = regex.search(nextSentence)
                ### match 결과에 따른 처리
                sentence = None
                if match == None:
                    sentence = preSentence + nextSentence
                    offset = index
                elif match != None and match.start() != 0:
                    sentence = preSentence + nextSentence[:match.start()].strip()
                    offset = index + match.start()
                else:
                    sentence = preSentence
                    offset = index
                contents.append(sentence)

            ## 결과 저장
            self.__sentences = contents
            return True
        except Exception as err:
            print(err)
            return False

    def processingSubtitle(self):
        try:
            ## 문장 분석
            result = self.processingSentences()
            if not result:
                return False
            ## 종결 어미를 기준으로 새롭게 나누어진 문장을 이용하여 자막 시작시간과 끝시간을 맞추어서 새로운 데이터 생성
            offset = 0
            self.subtitles = []
            for sent in self.__sentences:
                start, end = None, None
                for index, line in enumerate(self.__srtData):
                    if index < offset:
                        continue
                    else:
                        if sent.find(line.content) != -1:
                            if start == None:
                                start = line.start
                            if end == None or end < line.end:
                                end = line.end
                        else:
                            offset = index
                            break
                sentObj = Subtitle(start, end, sent)
                self.subtitles.append(sentObj)
            return True
        except Exception as err:
            print(err)
            return False

    def getRawSubtitles(self):
        return self.__srtData

    def getSubtitleContents(self):
        contents = [elem.content for elem in self.subtitles]
        return " ".join(contents)