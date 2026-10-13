// Development builds only (M9b decision 3): a release bundle holds this line alone; the screen is src/dev/routes/workout.tsx.
export default __DEV__ ? require('../../src/dev/routes/workout.tsx').default : () => null;
