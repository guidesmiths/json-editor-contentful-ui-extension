import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';

import schema from './schema.json';

function debounce (func, wait) {
  let timeout;
  return function () {
      const context = this, args = arguments;
      const later = function () {
          timeout = null;
          func.apply(context, args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (!timeout) func.apply(context, args);
  };
}

const Extension = ({ sdk }) => {
  const ref = React.createRef();

  const [value, setValue] = useState(sdk.field.getValue() || {});
  const [detachExternalChangeHandler, setDetachExternalChangeHandler] = useState(null);
  const [jsonEditor, setJSONEditor] = useState(null);

  const onExternalChange = value => {
    setValue(value);
  };

  useEffect(() => {
    sdk.window.startAutoResizer();

    // Handler for external field value changes (e.g. when multiple authors are working on the same entry).
    setDetachExternalChangeHandler(sdk.field.onValueChanged(onExternalChange));

    return function cleanup() {
      if (detachExternalChangeHandler) detachExternalChangeHandler();

      if (jsonEditor) {
        jsonEditor.destroy();
        setJSONEditor(null);
      }
    };
  }, [detachExternalChangeHandler, jsonEditor, sdk.field, sdk.window]);

  const initializeEditor = useCallback(() => {
    const editorRef = new JSONEditor(ref.current, { // eslint-disable-line no-undef
      theme: 'foundation5',
      schema: schema,
      no_additional_properties: true,
      required_by_default: true,
      startval: value,
      disable_collapse: true,
      disable_properties: true,
      show_errors: 'always'
    });
    setJSONEditor(editorRef);

    const watcherCallback = () => {
      sdk.window.updateHeight();
      validateAndSave();
    };

    Object.keys(editorRef.editors).forEach(key => {
      if (Object.prototype.hasOwnProperty.call(editorRef.editors, key) && key !== 'root') {
        editorRef.watch(key, watcherCallback.bind(editorRef, key));
      }
    });

    const validateAndSave = debounce(function () {
      const errors = editorRef.validate();
      if (errors.length === 0) sdk.field.setValue(editorRef.getValue());
    }, 150);
  }, [ref, sdk.field, sdk.window, value]);

  useEffect(() => {
    if (ref && !jsonEditor) initializeEditor();
  }, [ref, jsonEditor, initializeEditor]);

  return <div ref={ref} />;
}

Extension.propTypes = {
  sdk: PropTypes.object.isRequired
};

export default Extension;
