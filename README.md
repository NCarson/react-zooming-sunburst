
# Bundling Node with GNU Make

## Understand what your building.

Basic template using GNU Make, react, and reactstrap. The default setup
uses CDN from [unpkg](http://unpkg.com) for dependicies. The bundle.js is only about 4k gzipped.
If you add libraries it will be built in vendor.js so it only compiles
your source code and only the files that have changed :)

You can see the test performance at https://www.webpagetest.org/result/180726_CQ_cab4cd1fb09e858d7d24068943cc631e/
where uncached it rendered in about .6 seconds.

# Install

```
npm install
make
http-server -g
```
![screenshot](https://github.com/NCarson/makefile-react-template/raw/master/Capture.PNG "Logo Title Text 1")


# Doc
See the [tutorial](#tutorial) if you are not familiar with make.


`make` calls tools from the command line so make sure you have these
packages installed globally:

`sudo npm -g i babel-cli browserify nunjucks uglify-js`

You can examine the `Makefile` and you can change the default file and directory locations.

## NODE_ENV

This makefile is setup to respect the `NODE_ENV` variable. If it is set
to "development" then the minified version will not be built. Otherwise,
it builds everything since `uglifyjs` requires the `bundle.js` anyways.

## Local Libraries

Make will check your `package-lock.json` on builds and if that changes it will
rebuild your `vendor.js`. But, it you import new libraries in your source that are 
already installed, `make` will not know about it so you should 
`$ make clean && make` to rebuild everything.

## Setting up CDN

This project is setup to use the npm plugin `browersify-global-shim`.
This is needed for to import the modules correctly.
So if you add a CDN, figure out how the main object gets imported and 
add a config line into the `package.json`:

```
  "browserify-global-shim": {
    "react": "React",
    "react-dom": "ReactDOM",
    "reactstrap": "Reactstrap",
  }
```

Then edit the makefile and the url and library name to to these variables.

```makefile
CDN_LIBS := react react-dom $(REACTSTRAP_LIBS) object-assign
CDN_URLS := <script src='https://unpkg.com/react@16.4.1/umd/react.production.min.js'> ...
```

Then the library will be excluded from the `vendor.js` build and the url will be
templated into `index.html`

This can be tricky to get right and your mileage may vary. For instance the
normal reactstrap library does not work right because you need the "full" version:
`https://unpkg.com/reactstrap@6.3.0/dist/reactstrap.full.min.js`. This one 
pulls in all of reactstrap's dependencies. So, they should also be added into
`CDN_LIBS`.


# Tutorial

[Make](https://en.wikipedia.org/wiki/Make_(software)Make) is a very old tool
dating back to 1976! That fact that its still in use speaks to its usefulness.
A lot of people complain about it cryptic nature, but if you take the time to
learn it you can do a lot of things for a little bit of code.

The problem with tools like `webpack` is that either work or they don't. And when
they do not you probably are not going to have much of a clue why they broke.
So, lets try to do this with a Makefile. First, we need some command line tools.

`sudo npm -g i babel-cli browserify nunjucks uglify-js`

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
builds. We could add in lint checking, gzipping the bundle at the end, etc by
adding rules into the pipeline.

And this is why `make` is :sparkles: *cool* :sparkles:. It is generalized build tool that can build
**anything, any way you want, with only the tools you want to use**.

