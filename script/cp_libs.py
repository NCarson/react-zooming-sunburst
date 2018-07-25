
import os
import sys

direc = "/node_modules"
exclude = [a for a in os.environ.get("EXCLUDE", "").split(" ") if a]
if exclude:
    sys.stderr.write("excluding %s\n" % exclude)
current = os.getcwd()
l = []

for line in sys.stdin:
    line = line.strip()
    if not line.startswith(current):
        sys.stderr.write("warning: file installed globaly %s\n" % line)
        continue

    path = line.replace(current, '')
    #for e in exclude:
    #    if path.startswith(direc + e):
    #        #sys.stderr.write("warning: excluding %s\n" % line)
    #        continue

    line = line.strip()
    l.append((line, 'lib' + path))

l.sort()

for full, path in l:
    print("mkdir -p `dirname {}`".format(path))
    print("cp {} {}".format(full, path))

