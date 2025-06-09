import { createDefaultEsmPreset } from "ts-jest";

const presetConfig = createDefaultEsmPreset({});

const jestConfig = {
  ...presetConfig,
  moduleNameMapper: {
    "^src/(.*)$": "<rootDir>/src/$1",
    "^(.*)\\.js$": "$1"
  }
};

export default jestConfig;
