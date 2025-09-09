#!/usr/bin/env node
import { makeCli, run } from "./core/program";

run(makeCli(), process.argv);
