import React from 'react';

/**
 * Renders the status cell in an AG Grid table with an icon and text.
 * @param {Object} params - The cell renderer parameters.
 * @returns {JSX.Element} The rendered status cell.
 */
export default function StatusCellRenderer(params) {
  let icon = '';
  switch (params.value) {
    case 'Completed':
      icon = '&#9989;'; // GREEN CHECKMARK
      break;
    case 'Error':
      icon = '&#10060;'; // RED CROSS
      break;
    case 'Created':
      icon = '<span class="text-lg align-baseline text-blue-600">&#10041;</span>'; // TWELVE POINTED BLACK STAR
      break;
    case 'Processing':
    case 'Executing':
      icon = '&#9193;'; // BLACK RIGHT-POINTING DOUBLE TRIANGLE
      break;
    default:
      icon = '';
  }
  return <span dangerouslySetInnerHTML={{ __html: `${icon} ${params.value}` }} />;
}
