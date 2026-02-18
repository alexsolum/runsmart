import React from 'react';
import HtmlSection from '../components/HtmlSection';
import markup from '../legacy/markup';

export default function DataPage() {
  return <HtmlSection html={markup.data} />;
}
