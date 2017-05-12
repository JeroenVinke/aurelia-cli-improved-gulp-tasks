import * as gulp from 'gulp';
import transpile from './transpile';
import processMarkup from './process-markup';
import processCSS from './process-css';
import copyFiles from './copy-files';
import {CLIOptions, build as buildCLI} from 'aurelia-cli';
import watch from './watch';
import * as project from '../aurelia.json';

let build = gulp.series(
  readProjectConfiguration,
  gulp.parallel(
    transpile,
    processMarkup,
    processCSS,
    copyFiles
  ),
  writeBundles
);

let main;

if (CLIOptions.hasFlag("watch")) {
  main = gulp.series(
    build,
    watch
  );
} else {
  main = build;
}

function readProjectConfiguration() {
  return buildCLI.src(project);
}

function writeBundles() {
  return buildCLI.dest();
}

export { main as default, build, readProjectConfiguration, writeBundles};