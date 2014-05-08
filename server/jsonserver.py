#!/usr/bin/env python

# a server to serve json files to IE as a non-standard mime type
# so IE won't fall over

import SimpleHTTPServer


class MyHTTPRequestHandler(SimpleHTTPServer.SimpleHTTPRequestHandler):

    def guess_type(self, path):
        ctype = SimpleHTTPServer.SimpleHTTPRequestHandler.guess_type(self, path)
        if ctype == 'application/json':
            ctype = 'application/javascript'
        return ctype

if __name__ == '__main__':
    SimpleHTTPServer.test(HandlerClass=MyHTTPRequestHandler)
