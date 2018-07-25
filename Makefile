# Makefile for transpiling with Babel in a Node app, or in a client- or
# server-side shared library.
#
#
# Based on this gist:
# https://gist.github.com/hallettj/29b8e7815b264c88a0a0ee9dcddb6210

# good stuff on cdn browserify
# https://shinglyu.github.io/web/2018/02/08/minimal-react-js-without-a-build-step-updated.html

CDN_LIBS := react react-dom reactstrap popper.js fbjs react-popper prop-types react-lifecycles-compat classnames

INDEX_DIR := public
DIST_DIR := $(INDEX_DIR)/dist
LIB_DIR := lib
SRC_DIR := src
TARGET := $(DIST_DIR)/bundle.js
VENDOR:= $(DIST_DIR)/vendor.js
DEP_FILE := $(LIB_DIR)/.deps

#FIXME does not work
#ifndef NODE_ENV
#	TARGETS=$(TARGET).min.gz $(VENDOR).min.gz
#else
#	# uglifyjs requires the bundle to built anyway
#	TARGETS=$(TARGET).gz $(VENDOR).gz
#endif

# production minimized targets
#TARGETS := $(patsubst %.js,%.min.js.gz, $(TARGET) $(VENDOR)) 
TARGETS := $(TARGET) $(VENDOR)

TARGET_BUILT := $(notdir $(TARGET))
VENDOR_BUILT := $(notdir $(VENDOR))

BABEL := babel --plugins transform-react-jsx  --presets=es2015,react
BROWSERIFY := browserify
UGLIFYJS := uglifyjs
GZIP := gzip

EXC_MODULES := python3 script/get_modules.py `pwd`/node_modules/ $(DEP_FILE) "-x="
INC_MODULES := python3 script/get_modules.py `pwd`/node_modules/ $(DEP_FILE) "-r=" "$(CDN_LIBS)"

SRC_FILES := $(shell find $(SRC_DIR)/ -name '*.js')

# Building will involve copying every `.js` file from `src/` to a corresponding
# file in `lib/` with a `.js.flow` extension. Then we will run `babel` to
# transpile copied files, where the transpiled file will get a `.js` extension.
# This assignment computes the list of transpiled `.js` that we expect to end up;
# and we will work backward from there to figure out how to build them.

TRANSPIELD_FILES := $(patsubst $(SRC_DIR)/%,lib/%,$(SRC_FILES))

# Putting each generated file in the same directory with its corresponding
# source file is important when working with Flow: during type-checking Flow
# will look in npm packages for `.js.flow` files to find type definitions. So
# putting `.js` and `.js.flow` files side-by-side is how you export type
# definitions from a shared library.

# Compute the list of type-definition source files that we want to end up with.
# This is done by replacing the `.js` extension from every value in the
# `TRANSPIELD_FILES` list with a `.js.flow` extension.

FLOW_FILES := $(patsubst %.js,%.js.flow,$(TRANSPIELD_FILES))

.PHONY: all clean clean_dist

# make the vender and target bundles
all: $(INDEX_DIR)/index.html

$(INDEX_DIR)/index.html: $(TARGETS) $(INDEX_DIR)/index.jinja
	echo '{ "vendor": "$(VENDOR_BUILT)?$(shell cat $(LIB_DIR)/.vendor.time)", "bundle": "$(TARGET_BUILT)?$(shell cat $(LIB_DIR)/.bundle.time)" }' \
		> $(INDEX_DIR)/index.json
	nunjucks $(INDEX_DIR)/index.jinja $(INDEX_DIR)/index.json

# remove the build lib and dist files
clean:
	rm $(LIB_DIR)/* -fr
	rm $(DIST_DIR)/* -f 
	rm $(DEP_FILE) -f
	rm $(INDEX_DIR)/index.html -f

# remove the dist bundle js files
clean_dist:
	rm $(DIST_DIR)/* -fr 

vender_size:
	du -hsc $(shell python3 script/get_modules.py `pwd`/node_modules/ $(DEP_FILE) | sed 's/[^ ]* */node_modules\/&/g') | sort -h

%.gz: %
	$(GZIP) $< --stdout > $@

.PRECIOUS: %.min.js #make will delete these as 'intermediate' without this
%.min.js: %.js
	$(UGLIFYJS) -cmo $@ $<

$(TARGET): $(FLOW_FILES) $(TRANSPIELD_FILES) $(DEP_FILE) 
	$(BROWSERIFY) --transform browserify-global-shim -d -o $(TARGET) $(shell find $(LIB_DIR) -type f -name '*.js') $(shell $(EXC_MODULES))
	echo $(shell date +%s) > $(LIB_DIR)/.bundle.time

# depends if the node_moules changed
# XXX not really true; app code may or may not have included or removed vendor dependencies
 
$(VENDOR): $(DEP_FILE)
	$(BROWSERIFY)  --transform browserify-global-shim $(shell $(INC_MODULES)) > $(VENDOR)
	echo $(shell date +%s) > $(LIB_DIR)/.vendor.time

$(DEP_FILE): package-lock.json
	$(BROWSERIFY) --list $(shell find lib/ -type f -name '*.js') > $(LIB_DIR)/.deps

# #XXX this is not doing anything right now

lib/%.js.flow: $(SRC_DIR)/%.js
	mkdir -p $(dir $@)
	cp $< $@

lib/%: src/%
	mkdir -p $(dir $@)
	$(BABEL) $< --out-file $@ --source-maps
