class IOHandler:
    def __init__(self, path, type):
        self.file = open(path, type, encoding='utf-8')

    def read(self, sent_id):
        if sent_id == 0:
            self.file.seek(0)
            self.iter = iter(self.file)
        try:
            return next(self.iter)
        except:
            return None

    def write(self, sent_id, data):
        self.file.write(data)

    def delete(self):
        self.file.close()