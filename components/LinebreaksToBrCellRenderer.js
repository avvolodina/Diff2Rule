const LinebreaksToBrCellRenderer = (params) => {
  return <div dangerouslySetInnerHTML={{ __html: params.value?.replace(/[\r\n]+/g, '<br/>') }} />;
};

export default LinebreaksToBrCellRenderer;
