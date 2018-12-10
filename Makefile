
all:
	cd src && make

example:
	cd example && make
	cd template && make

clean:
	cd src && make clean
	cd template && make clean

define make_cdn
	@ json -f package.json dependencies |\
	json --items -c 'RegExp("$1").test(this.key)' |\
	json -e 'this.name = this.key' |\
	json -e 'this.prod = `$(strip $2)`' |\
	json -e 'this.dev = `$(strip $3)`' |\
	json -e 'this.key = undefined; this.value = undefined'
	
endef

cdn-d3:
	$(call make_cdn,^d3-,\
		https://unpkg.com/$${this.key}@$${this.value}/dist/$${this.name}.min.js,\
		https://unpkg.com/$${this.name}@$${this.value}/dist/$${this.name}.js)

cdn-react:
	$(call make_cdn,^react$$,\
		https://unpkg.com/react@$${this.value}/umd/react.development.js,\
		https://unpkg.com/react@$${this.value}/umd/react.production.js)

cdn-react-dom:
	$(call make_cdn,^react-dom$$,\
		https://unpkg.com/react-dom@$${this.value}/umd/react-dom.development.js,\
		https://unpkg.com/react-dom@$${this.value}/umd/react-dom.production.js)
