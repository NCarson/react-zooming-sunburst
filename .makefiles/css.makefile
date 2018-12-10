ifndef MFS_CONF_DEFINED
  $(error include .conf.makefile first)
endif

CSS_FILES = $(shell find $(SRC_DIR) $(_MFS_EXCLUDE) -name '*.css')

#http://www.tero.co.uk/scripts/minify.php
minify_css ?= sed -e "s|/\*\(\\\\\)\?\*/|/~\1~/|g" \
	-e "s|/\*[^*]*\*\+\([^/][^*]*\*\+\)*/||g" \
	-e "s|\([^:/]\)//.*$$|\1|" \
	-e "s|^//.*$$||" | tr '\n' ' ' | \
	sed -e "s|/\*[^*]*\*\+\([^/][^*]*\*\+\)*/||g" \
	-e "s|/\~\(\\\\\)\?\~/|/*\1*/|g" \
	-e "s|\s\+| |g" \
	-e "s| \([{;:,]\)|\1|g" \
	-e "s|\([{;:,]\) |\1|g" 

# make will delete these as 'intermediate' without this
.PRECIOUS: %.min.css
## minify css
%.min.css: %.css
	@ mkdir -p `dirname $@`
ifdef PRODUCTION
	@ $(call info_msg,css - minify (prod/on),$@,$(BLUE))
	@ cat $< | $(minify_css) > $@
else
	@ $(call info_msg,css - minify (dev/off),$@,$(GRAY))
	@ cp $< $@
endif

.PRECIOUS: %/$(CSS_BASENAME).css
## cat css into one file
%/$(CSS_BASENAME).css: $(CSS_FILES)
	@ mkdir -p `dirname $@`
	@ $(call info_msg,css - cat,$^,$(BOLD)$(YELLOW))
	@ echo "/* XXX	Auto Generated; modifications will be OVERWRITTEN; see js.makefile XXX */" > $@
	@ for name in $(CSS_FILES); do printf "\n/* $$name */" >>$@ ; cat $$name >> $@; done;

