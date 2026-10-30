import { mountApplication, needsApplication } from './utils/applicationEntry';

if (needsApplication(window.location.search, window.location.hash)) {
  // Load the same React entry as /app without navigating or touching OAuth data.
  void mountApplication(document, () => import('./main'));
}
