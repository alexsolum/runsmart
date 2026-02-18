import React from 'react';
import HtmlSection from './HtmlSection';
import markup from '../legacy/markup';

export default function Topbar() {
  return <HtmlSection html={markup.topbar} />;
}
