import { createDefaultEsmPreset } from "ts-jest";

const presetConfig = createDefaultEsmPreset({});

const jestConfig = {
  ...presetConfig,
};

export default jestConfig;
