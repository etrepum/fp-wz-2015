# Install pandoc globally or run "stack install pandoc"
PANDOC ?= $(shell which ./.local/bin/pandoc 2>/dev/null || echo pandoc)

.PHONY: all live

all: index.html dist/index.js

live:
	npm start

clean:
	rm -f index.html dist/index.js

dist:
	mkdir -p $@

dist/index.js: index.jsx package.json | dist
	npm run build

index.html: slides.md header.html default.revealjs Makefile
	$(PANDOC) -s \
	  --mathjax \
	  --include-in-header="header.html" \
	  -t revealjs \
	  --variable=transition:none \
	  --variable=css:reveal.js/css/theme/white.css \
	  --variable=css:vendor/font-awesome-4.4.0/css/font-awesome.css \
	  --from=markdown+definition_lists \
	  --template default.revealjs \
	  -o $@ \
	  $<
