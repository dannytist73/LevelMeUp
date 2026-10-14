// The app's entry (M10c): expo-router's, then the home-screen widget's task, which Android runs without the app open.
import 'expo-router/entry';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from './src/widget/taskHandler.tsx';

registerWidgetTaskHandler((props) => widgetTaskHandler(props));
