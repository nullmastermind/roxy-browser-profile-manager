set windows-shell := ["powershell.exe", "-NoLogo", "-NoProfile", "-Command"]

default:
    @just --list

dev:
    bun run dev

build:
    bun run build

compile:
    bun run compile

lint:
    bun run lint

start:
    bun run start

prisma-generate:
    bun run prisma:generate

prisma-migrate:
    bun run prisma:migrate

prisma-migrate-deploy:
    bun run prisma:migrate:deploy

prisma-migrate-reset:
    bun run prisma:migrate:reset

prisma-push:
    bun run prisma:push

prisma-pull:
    bun run prisma:pull

prisma-studio:
    bun run prisma:studio

prisma-format:
    bun run prisma:format

prisma-validate:
    bun run prisma:validate
