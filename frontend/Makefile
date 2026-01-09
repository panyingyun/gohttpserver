.PHONY: env dev lint build clean

all: env dev lint build clean

env:
	@echo "=========install npm dependencies ==========="
	npm install

dev:
	@echo "=========dev ==========="
	npm run dev

lint:
	@echo "=========lint ==========="
	npm run lint

build:
	@echo "=========build ==========="
	npm run build

clean:
	@echo "=========clean ==========="
	rm -rf node_modules
	rm -rf dist