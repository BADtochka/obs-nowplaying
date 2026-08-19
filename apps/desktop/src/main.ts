import { createApp } from 'vue';
import './styles.css';
import App from './App.vue';
import WidgetPage from './components/pages/WidgetPage.vue';

const isWidgetPage = window.location.pathname === '/widget' || window.location.pathname === '/widget/';
if (isWidgetPage) document.body.classList.add('widget-page');

createApp(isWidgetPage ? WidgetPage : App).mount('#app');
