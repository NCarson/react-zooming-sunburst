all:
	cd src && make

example:
	cd example && make
	cd template && make

clean:
	cd src && make clean
	cd template && make clean

docs:
	cd src && make docs

commit-doc:
	git add docs README.md
	git commit -m "updated doc"
	git push

publish:
	cd src && make clean
	cd src && PRODUCTION=1 make
	cd src && make doc
	npm publish

