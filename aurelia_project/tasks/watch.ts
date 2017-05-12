import * as gulp from 'gulp';
import * as project from '../aurelia.json';
import * as minimatch from "minimatch";
import * as gulpWatch from "gulp-watch";
import * as debounce from "debounce";
import transpile from './transpile';
import processMarkup from './process-markup';
import processCSS from './process-css';
import copyFiles from './copy-files';
import {readProjectConfiguration, writeBundles} from './build';

const debounceWaitTime = 100;
let isBuilding = false;
let pendingRefreshPaths = [];

let watch = () => {
  return gulpWatch(
    [
      project.transpiler.source,
      project.markupProcessor.source,
      project.cssProcessor.source
    ],
    {
      read: false, // performance optimization: do not read actual file contents
      verbose: true
    },
    (vinyl) => {
      if (vinyl.path && vinyl.cwd && vinyl.path.startsWith(vinyl.cwd)) {
        let pathToAdd = vinyl.path.substr(vinyl.cwd.length + 1);
        log(`Watcher: Adding path ${pathToAdd} to pending build changes...`);
        pendingRefreshPaths.push(pathToAdd); 
        refresh();
      }
    });
});

let refresh = debounce(() => {
  if (isBuilding) {
    log("Watcher: A build is already in progress, deferring change detection...");
    return;
  }

  isBuilding = true;

  let paths = pendingRefreshPaths.splice(0);
  let tasks = [];
  
  // dynamically compose tasks, note: extend as needed, for example with copyFiles, linting etc.
  if (paths.find((x) => minimatch(x, project.cssProcessor.source))) {
    log("Watcher: Adding CSS tasks to next build...");
    tasks.push(processCSS);
  }

  if (paths.find((x) => minimatch(x, project.transpiler.source))) {
    log("Watcher: Adding transpile task to next build...");
    tasks.push(transpile);
  }

  if (paths.find((x) => minimatch(x, project.markupProcessor.source))) {
    log("Watcher: Adding markup task to next build...");
    tasks.push(processMarkup);
  }

  if (tasks.length === 0) {
    log("Watcher: No relevant changes found, skipping next build.");
    isBuilding = false;
    return;
  }
  
  let toExecute = gulp.series(
    readProjectConfiguration,
    gulp.parallel(tasks),
    writeBundles,
    (done) => {
      isBuilding = false;
      done();
      if (pendingRefreshPaths.length > 0) {
        log("Watcher: Found more pending changes after finishing build, triggering next one...");
        refresh();
      }
    }
  );

  toExecute();
}, debounceWaitTime);

function log(message: string) {
  console.log(message);
}

export default watch;