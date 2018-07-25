

import sys

direc = sys.argv[1]
if len(sys.argv) > 3:
    prefix = sys.argv[3]
else:
    prefix = ''

if len(sys.argv) > 4:
    cdns = sys.argv[4].split()
else:
    cdns = []

#sys.stderr.write("cdns: {}\n".format(cdns))

libs = set()
for line in open(sys.argv[2]):
    #sys.stderr.write("lib: {}\n".format(line.strip()))
    if not line.startswith(direc):
        continue
    lib = line.replace(direc, '').split('/')[0]
    if lib in cdns: 
        continue
    libs.add(prefix + lib)
    
#sys.stderr.write("libs: {}\n".format(libs))
sys.stdout.write(' '.join(libs))
