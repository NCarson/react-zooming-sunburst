# beginning based on this gist:
# https://gist.github.com/hallettj/29b8e7815b264c88a0a0ee9dcddb6210

# good stuff on cdn browserify
# https://shinglyu.github.io/web/2018/02/08/minimal-react-js-without-a-build-step-updated.html
#
.DELETE_ON_ERROR:
 
# these should be installed globally
BABEL := babel --plugins transform-react-jsx --plugins transform-class-properties --presets=es2015,react
BROWSERIFY := browserify
BROWSERIFY_SHIM := --transform browserify-global-shim 
UGLIFYJS := uglifyjs
NUNJUCKS := nunjucks
GZIP := gzip

ifdef NO_LINT
	LINTER := true
else
	LINTER := eslint --parser babel-eslint --plugin react --plugin import
endif

# directory structure
INDEX_DIR := public
DIST_DIR := $(INDEX_DIR)/dist
TEMPL_DIR := templates
LIB_DIR := lib
SRC_DIR := src
DEP_FILE := $(LIB_DIR)/.deps

SRC_FILES := $(shell find $(SRC_DIR)/ -name '*.js')
LIB_FILES := $(patsubst $(SRC_DIR)/%,$(LIB_DIR)/%,$(SRC_FILES))

#$(info 'SRC_FILES =' $(SRC_FILES))
#$(info 'LIB_FILES =' $(LIB_FILES))

#libs that should not go in vendor build
BROKEN_LIBS := lodash.isfunction lodash.tonumber lodash.isobject
BROKEN_LIBS := shallow-equal 

#CDN libs will be excluded from the vender build
# but you have to set them up yourself
REACTSTRAP_LIBS := reactstrap popper.js fbjs react-popper  \
	react-lifecycles-compat classnames 
CDN_LIBS := $(BROKEN_LIBS) react react-dom $(REACTSTRAP_LIBS) object-assign babel-runtime
CDN_URLS := <script src='https://unpkg.com/react@16.4.1/umd/react.production.min.js'></script><script src='https://unpkg.com/react-dom@16.4.1/umd/react-dom.production.min.js'></script><script src='https://unpkg.com/reactstrap@6.3.0/dist/reactstrap.full.min.js'></script>
CDN_URLS := <script src='https://unpkg.com/react@16.4.1/umd/react.development.js'></script><script src='https://unpkg.com/react-dom@16.4.1/umd/react-dom.development.js'></script><script src='https://unpkg.com/reactstrap@6.3.0/dist/reactstrap.full.js'></script>

TARGET_BUILD := $(DIST_DIR)/bundle.js
VENDOR_BUILD := $(DIST_DIR)/vendor.js

# do not minify if were in dev
ifeq ($(NODE_ENV),"development")
	TARGET := $(TARGET_BUILD)
	VENDOR:= $(TARGET_BUILD)
else
	TARGET := $(DIST_DIR)/bundle.min.js
	VENDOR:= $(DIST_DIR)/vendor.min.js
endif

TARGETS := $(TARGET) $(VENDOR)
TARGETS_GZ := $(TARGET).gz $(VENDOR).gz

EXC_MODULES := python3 script/get_modules.py `pwd`/node_modules/ $(DEP_FILE) "-x="
INC_MODULES := python3 script/get_modules.py `pwd`/node_modules/ $(DEP_FILE) "-r=" "$(CDN_LIBS)"

SRC_FILES := $(shell find $(SRC_DIR)/ -name '*.js')
TRANSPILED_FILES := $(patsubst $(SRC_DIR)/%,lib/%,$(SRC_FILES))
COMP_FILES := $(shell find $(INDEX_DIR)/ -name '*.svg')
COMP_FILES_GZ := $(patsubst %.svg,%.svg.gz,$(COMP_FILES))


.PHONY: all clean clean_dist vendor_size
# make the vendor and target bundles
all: $(INDEX_DIR)/index.html  $(COMP_FILES_GZ)

# remove the build lib and dist files
clean:
	rm $(LIB_DIR)/* -fr
	rm $(DIST_DIR)/* -f 
	rm $(DEP_FILE) -f
	rm $(INDEX_DIR)/index.html -f

# remove the dist bundle js files
clean_dist:
	rm $(DIST_DIR)/* -fr 

clean_vendor:
	rm $(DIST_DIR)/vendor* -fr 

# how big the _required_ node_module dirs are
vendor_size:
	du -hsc $(shell python3 script/get_modules.py `pwd`/node_modules/ $(DEP_FILE) | sed 's/[^ ]* */node_modules\/&/g') | sort -h

$(INDEX_DIR)/index.html: $(TARGETS_GZ) $(TEMPL_DIR)/index.jinja
	echo '{ "vendor": "$(notdir $(VENDOR))?$(shell cat $(LIB_DIR)/.vendor.time)", "bundle": "$(notdir $(TARGET))?$(shell cat $(LIB_DIR)/.bundle.time)",  "cdn_urls": "$(CDN_URLS)"}' \
		> $(TEMPL_DIR)/index.json
	$(NUNJUCKS) $(TEMPL_DIR)/index.jinja $(TEMPL_DIR)/index.json
	mv $(TEMPL_DIR)/index.html $(INDEX_DIR)

%.gz: %
	$(GZIP) $< --stdout > $@

.PRECIOUS: %.min.js #make will delete these as 'intermediate' without this
%.min.js: %.js
	#$(UGLIFYJS) -cmo $@ $<
	cp $< $@

$(TARGET_BUILD): $(LIB_FILES) $(DEP_FILE) 
	$(BROWSERIFY) $(BROWSERIFY_SHIM) -d -o $(TARGET_BUILD) $(shell find $(LIB_DIR) -type f -name '*.js') $(shell $(EXC_MODULES))
	echo $(shell date +%s) > $(LIB_DIR)/.bundle.time

# depends if the node_moules changed
# XXX not really true; app code may or may not have included or removed vendor dependencies
$(VENDOR_BUILD): $(DEP_FILE)
	$(BROWSERIFY) $(BROWSERIFY_SHIM) $(shell $(INC_MODULES)) > $(VENDOR_BUILD)
	echo $(shell date +%s) > $(LIB_DIR)/.vendor.time

$(DEP_FILE): package-lock.json
	$(BROWSERIFY) --list $(shell find lib/ -type f -name '*.js') > $(LIB_DIR)/.deps

$(LIB_DIR)/%: $(SRC_DIR)/%
	$(LINTER) $<
	mkdir $(dir $@) -p
	$(BABEL) $< --out-file $@ --source-maps

