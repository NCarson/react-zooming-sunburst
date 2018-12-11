ifndef MFS_CONF_DEFINED
  $(error include .conf.makefile first)
endif

######################################
#  Find files
######################################

SRC_FILES = $(shell find $(SRC_DIR) $(_MFS_EXCLUDE) -name '*.js')
ES5_FILES = $(patsubst $(SRC_DIR)%.js,$(BUILD_DIR)/%.js,$(SRC_FILES))

######################################
#  Rules
######################################

$(PACKAGE_LOCK):
	$(call info_message,touch - create,$@)
	@ touch $(PACKAGE_LOCK)

$(EXCL_FILE):
	@ $(call info_msg,json - create,$@,$(BOLD))
	@ echo "[]" > $@

## strips library paths to import names
# 		          remove root       ignore local stuff       remove node_modules    first direc
STRIP_DEPS ?= \
	sed "s:^`cd $(BASE_DIR) && pwd`/::" |\
	grep  "^$(strip $(MODULES_NAME))" |\
	sed "s:^$(strip $(MODULES_NAME))::" |\
	cut -d "/" -f2 |sort |uniq

# notice order-only prereq: | 
# ES5_FILES will only be a prereq if PACKAGE_LOCK is old.
# Otherwise vendor would be dependent on ES5_FILES and always be rebuilt.
%$(DEP_SUFFIX): $(EXCL_FILE) $(PACKAGE_LOCK) | $(ES5_FILES)
	@$(call info_msg,browserify - find deps,$@,$(MAGENTA))
	@$(BROWSERIFY) --list $(ES5_FILES) | $(STRIP_DEPS) > $@

.PRECIOUS: %.min.js
## minfy
%.min.js: %.js
	@ mkdir -p `dirname $@`
ifdef PRODUCTION
	@ $(call info_msg,uglify - minify (prod/on),$@,$(BLUE))
	@ $(UGLIFYJS) -cmo $@ $<
else
	@ $(call info_msg,uglify - minify (dev/off),$@,$(GRAY))
	@ cp $< $@ #were pretending to uglify since were in dev mode
endif

define mjs_make_bundle
	@ mkdir -p `dirname $@`
	@ $(call info_msg,browerisfy - $1,$2 $3 $4,$(BOLD)$(MAGENTA))
	@ $(BROWSERIFY) $6 -o $2 $3 $4
	@ $(call set_timestamp,$5)
endef

MFS_EXCLUDED_LIBS = $(JSON) -f $(EXCL_FILE) -a name
## browiserify flags to force exclusion
EXC_DEPS = $(shell cat $(DEP_FILE) | sed 's/ / -x /g' | sed 's/^/ -x /')
## removes libraries found in exclude file
ONLY_INCLUDE = $(MFS_EXCLUDED_LIBS) | grep -Fx -v -f - $(DEP_FILE)
## browiserify flags to force inclusion
INC_DEPS = $(shell $(ONLY_INCLUDE) | sed 's/ / -r /g' | sed 's/^/ -r /')
.PRECIOUS: %/$(UMD_BASENAME).js

## umd bundle
%/$(UMD_BASENAME).js: $(ES5_FILES) $(DEP_FILE)
	$(call mjs_make_bundle,umd,$@,$(ES5_FILES),$(EXC_DEPS),$(UMD_BASENAME),-s $(UMD_BASENAME))

.PRECIOUS: %/$(VENDOR_BASENAME).js
## vendor vendor bundle
%/$(VENDOR_BASENAME).js: $(DEP_FILE)
	$(call mjs_make_bundle,vendor,$@,,$(INC_DEPS),$(VENDOR_BASENAME))

.PRECIOUS: %/$(BUNDLE_BASENAME).js
## source bundle
%/$(BUNDLE_BASENAME).js: $(DEP_FILE) $(ES5_FILES)
	$(call mjs_make_bundle,bundle,$@,$(ES5_FILES),$(EXC_DEPS),$(BUNDLE_BASENAME))

######################################
# Transpile

.PRECIOUS: $(BUILD_DIR)/%.js
## lint and babel
$(BUILD_DIR)/%.js: %.js 
	@ mkdir -p `dirname $@`
ifneq ($(LINTER),)
	@ $(call info_msg,eslint - lint,$<,$(GREEN))
	@ $(LINTER) $<
endif
ifneq ($(BABEL),)
	@ $(call info_msg,babel - transplile,$@,$(BOLD)$(GREEN))
	@ $(BABEL) $< --out-file $@ 
else
	@ cp $< $@
endif


