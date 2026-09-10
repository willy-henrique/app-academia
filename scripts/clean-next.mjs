#!/usr/bin/env node

import { rm } from "node:fs/promises";
import { resolve } from "node:path";

const nextCacheDirectory = resolve(process.cwd(), ".next");

await rm(nextCacheDirectory, { force: true, recursive: true });
console.log("Cache do Next limpo.");
