# XXX leading direcs with '../' or './' ARE IMPORTANT
BASE_DIR = ..
TARGET_DIR = $(BASE_DIR)/docs
# XXX these are main targets to build
# remove them if you dont want to build them
 
# gzip static stuff
COMPRESS_FILES := $(shell find $(TARGET_DIR)/ \
	-name '*.svg' \
	-o -name '*.html' \
	-o -name '*.css')
COMPRESS_FILES_GZ := $(patsubst %,%.gz,$(COMPRESS_FILES))

TARGETS = $(TARGET_DIR)/index.html \
		$(TARGET_DIR)/index.html.gz \
		$(COMPRESS_FILES_GZ)

include $(BASE_DIR)/.makefiles/conf.makefile
