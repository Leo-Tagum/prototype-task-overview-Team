// Parcel doesn't recognize the custom "development"/"production" export
// conditions that @radix-ui/primitive's "./is-development" subpath relies
// on, so the build's own package.json aliases that specifier straight
// here — always false, which is what a production bundle wants anyway.
export const IS_DEVELOPMENT = false;
