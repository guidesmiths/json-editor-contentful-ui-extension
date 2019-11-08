import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';

function debounce(func, wait) {
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

  const createEditor = useCallback(() => {
    const schemaName = sdk.parameters.instance.schemaName;
    const editorRef = new JSONEditor(ref.current, { // eslint-disable-line no-undef
      ajax: true,
      ajaxBase: 'https://raw.githubusercontent.com/guidesmiths/json-editor-contentful-ui-extension/master/schemas/',
      compact: false,
      disable_array_add: false,
      disable_array_delete: false,
      disable_array_reorder: false,
      enable_array_copy: false,
      disable_collapse: true,
      disable_edit_json: true,
      disable_properties: true,
      array_controls_top: true,
      form_name_root: 'root',
      iconlib: null,
      remove_button_labels: false,
      no_additional_properties: true,
      // refs: {} // An object containing schema definitions for URLs. Allows you to pre-define external schemas.
      required_by_default: true,
      keep_oneof_values: true,
      schema: {
        $ref: schemaName,
      },
      show_errors: 'always', // interaction | change | always | never
      startval: value,
      template: 'default',
      theme: 'foundation5',
      display_required_only: false,
      show_opt_in: true,
      prompt_before_delete: false,
      object_layout: 'table'
    });
    setJSONEditor(editorRef);
  }, [ref, sdk.entry.fields]);

  const initializeEditor = useCallback(() => {
    const watcherCallback = () => {
      sdk.window.updateHeight();
      validateAndSave();
    };

    Object.keys(jsonEditor.editors).forEach(key => {
      if (Object.prototype.hasOwnProperty.call(jsonEditor.editors, key) && key !== 'root') {
        jsonEditor.watch(key, watcherCallback.bind(jsonEditor, key));
      }
    });

    const validateAndSave = debounce(function () {
      const errors = jsonEditor.validate();
      if (errors.length === 0) sdk.field.setValue(jsonEditor.getValue());
    }, 150);
  }, [jsonEditor, sdk.field, sdk.window]);

  useEffect(() => {
    if (ref && !jsonEditor) createEditor();
  }, [ref, jsonEditor, createEditor]);

  useEffect(() => {
    if (jsonEditor) initializeEditor();
  }, [jsonEditor, initializeEditor]);

  return <div ref={ref} />;
}

Extension.propTypes = {
  sdk: PropTypes.object.isRequired
};

export default Extension;
