

# Bundling Node with GNU Make

## Understand what your building.


# Install

```
git clone xyz
cd xyz
npm i
make
http-server -g

```
# Doc
See the [tutorial](#tutorial) if you are not familiar with make.

`make` calls tools from the command line so make sure you have these
packages installed locally

`sudo npm -g i babel-cli browserify nunjucks uglify-js`


# Tutorial

[Make](https://en.wikipedia.org/wiki/Make_(software)Make) is a very old tool
dating back to 1976! That fact that its still in use speaks to its usefulness.
A lot of people complain about it cryptic nature, but if you take the time to
learn it you can do a lot of things for a little bit of code.

The problem with tools like webpack is that either work or they don't. And when
they do not you probably are not going to have much of a clue why they broke.
So, lets try to do this with a Makefile.

First we need some command line tools. `sudo npm -g i babel-cli browserify nunjucks uglify-js`

Makefiles work by a rule system that progressively builds up files. I think the
confusing thing about learning Make is that the rule system works in the reverse
of how we think -- it starts from the final file it needs and works backward to
figure out how to produce the file

```makefile
all: $(TARGET)
```

`all:` is the first rule and the conventional entry point in a makefile but it could be named
anything. This says we want some file called in this case `public/dist/bundle.js`.
It checks for the file and sees that it does not exist so it tries to find a rule to
build it.

```makefile
# create one big file
%/bundle.js: $(TRANSPILED_FILES)
	browserify -d -o $@ $(shell find lib -type f -name '*.js')
```

This is the next rule that matches. We see now that `public/dist/bundle.js` is now
on the left hand side of the colon. So this is how we will build The bundle.
Underneath are the commands that will be passed to the shell that will do the work
There are more requirements on the right hand side to fulfill before we can
execute the rule. This continues until the right hand side has no left hand side
rules.

An simple but complete example:
```makefile
TARGET := public/dist/bundle.js
SRC_FILES := $(shell find src/ -name '*.js')
# this will change the directory from src to lib
TRANSPILED_FILES := $(patsubst src/%,lib/%,$(SRC_FILES))
BABEL := babel --plugins transform-react-jsx  --presets=es2015,react

# entry point
all: $(TARGET)

clean:
    rm $(TARGET) $(TRANSPILED_FILES) -f

# minimize
%/bundle.min.js: %/bundle.js
    # $< is the right hand side of the colon
    # $@ is the left
	uglifyjs -cmo $@ $<  

# create one big file
%/bundle.js: $(TRANSPILED_FILES)
	browserify -d -o $@ $(shell find lib -type f -name '*.js')

# find all the files in src direc and transpile with babel into lib direc
$(TRANSPILED_FILES): $(SRC_FILES)
	mkdir -p $(dir $@)
	$(BABEL) $< --out-file $@ --source-maps
```

So `make` now knows it has to start by transpiling with babel and then bundle
with browserify.

```
$ make

mkdir -p lib/
babel --plugins transform-react-jsx  --presets=es2015,react src/App.js
--out-file lib/App.js --source-maps
browserify -d -o public/dist/bundle.js lib/App.js
```

How about a minimized version:
```
$ make TARGET=public/dist/bundle.min.js

uglifyjs -cmo public/dist/bundle.min.js public/dist/bundle.js  
```

Since we have a rule for bundle.min.js, we can overide `TARGET`
and make that too. Notice that `make` did not need to rebuild the whole
source tree again. It saw the requirement `public/dist/bundle.js` was already
built. The `$@` and `$<` are key pieces to making generalized rules to pipeline
builds. We could add in lint checking, gzipping the bundle at the end, etc with
the adding rules into the pipeline.

And this is why `make` is cool. It is generalized build tool that can build
**anything, any way you want, with only the tools you want to use**.

