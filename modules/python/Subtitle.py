class Subtitle:
    def __init__(self, start, end, content=""):
        self.start = start
        self.end = end
        self.content = content

    def get(self):
        return {"start": self.start, "end": self.end, "content": self.content}