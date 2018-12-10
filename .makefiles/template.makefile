ifndef MFS_CONF_DEFINED
  $(error include .conf.makefile first)
endif

TEMPLATE_FILES = $(shell find $(SRC_DIR) $(_MFS_EXCLUDE) -name '*$(TEMPLATE_SFX)')
TEMPLATE_BUILD_FILES = $(patsubst $(SRC_DIR)%$(TEMPLATE_SFX),$(BUILD_DIR)/%.html,$(TEMPLATE_FILES))

######################################
# Template
 
# set timestamps
define set_template_val
	@ test -f $(IDX_JSON_FILE) || echo "{}" > $(IDX_JSON_FILE)
	@ $(JSON) -I -f $(IDX_JSON_FILE) -e 'this.$(1)="$(2)"' 2>/dev/null
endef

set_timestamp = $(call set_template_val,ts_$(1),$(shell date +%s))

#list cdn hrefs
mfs_cdn_dev = $(shell $(JSON) -f $(EXCL_FILE) -a -e 'this.href=this.dev || this.prod'  -a href | tr '\n' ' ')
mfs_cdn_prod  = $(JSON) -f $(EXCL_FILE) -a -e 'this.href=this.prod'  -a href | tr '\n' ' '

make_script_link = <script type=\"text/javascript\" src=\"$(1)\"></script>\n
# pulls dev href or prod href
get_dev_cdns = $(foreach href,\
			   $(mfs_cdn_dev),\
			   $(call make_script_link,$(href)))

# pulls prod href
get_prod_cdns = $(foreach href,\
				$(shell $(mfs_cdn_prod)),\
			    $(call make_script_link,$(href)))


# Updates cdn in index.json info when EXCL_FILES changes.
%$(IDX_JSON): $(EXCL_FILE)
	@ $(call info_msg,cdn - update,$@,$(WHITE))
	@ test -f $@ || echo "{}" > $@

# Sometimes npm's dont have development builds so just use prod
# if thats all there is.
ifdef PRODUCTION
	@ $(call set_template_val,cdns,$(call get_prod_cdns))
else
	@ $(call set_template_val,cdns,$(call get_dev_cdns))
endif

.PRECIOUS: $(BUILD_DIR)/%.html
#template
$(BUILD_DIR)/%.html: %.json %$(TEMPLATE_SFX)
ifneq ($(TEMPLATER),)
	@ mkdir -p `dirname $@`
	$(call info_msg,template - create,$@,$(BOLD))
	@$(TEMPLATER) $< $(addsuffix $(TEMPLATE_SFX),$(basename $<)) > $@ 
else
	$(error no TEMPLATER program has been set)
endif

$(COMPRESS_FILES_GZ) : $(COMPRESS_FILES)
	@ $(call info_msg,gizp - compress,$@,$(BLUE))
	@ $(GZIP) $< --stdout > $@

