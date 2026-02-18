import React from 'react';
import HtmlSection from './HtmlSection';
import markup from '../legacy/markup';

export default function LegacyModals() {
  return (
    <>
      <HtmlSection html={markup.dayModal} />
      <HtmlSection html={markup.authModal} />
    </>
  );
}
