import * as Application from 'expo-application';
import Constants from 'expo-constants';

export const APP_VERSION = Constants.manifest?.version || Application.nativeApplicationVersion || '1.0.0';
export const APP_BUILD_NUMBER = Constants.manifest?.android?.versionCode || 
                               Constants.manifest?.ios?.buildNumber || 
                               Application.nativeBuildVersion || 
                               '1';

// Format: x.y.z (build ABC)
export const getFullVersion = () => `${APP_VERSION} (build ${APP_BUILD_NUMBER})`;