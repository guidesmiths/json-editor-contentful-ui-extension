import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import _debounce from 'lodash/debounce';

const Extension = ({ sdk }) => {
  const ref = React.createRef();

  const [value, setValue] = useState(sdk.field.getValue() || {});
  const [detachExternalChangeHandler, setDetachExternalChangeHandler] = useState(null);
  const [jsonEditor, setJSONEditor] = useState(null);

  useEffect(() => {
    const onExternalChange = value => {
      setValue(value);
    };

    const initializeEditor = editorRef => {
      const watcherCallback = () => {
        sdk.window.updateHeight();
        validateAndSave();
      };
    
      Object.keys(editorRef.editors).forEach(key => {
        if (Object.prototype.hasOwnProperty.call(editorRef.editors, key) && key !== 'root') {
          editorRef.watch(key, watcherCallback.bind(editorRef, key));
        }
      });
  
      const validateAndSave = _debounce(() => {
        const errors = editorRef.validate();
        if (errors.length === 0) {
          sdk.field.setValue(editorRef.getValue());
        } else {
          const error = errors.find(element => element.path !== 'root');
          sdk.notifier.error(`${error.path}: ${error.message}`);
        }
      }, 150);
    };

    const createEditor = () => {
      const defaultSchemaPath = sdk.parameters.installation.defaultSchemaPath;
      const schemaPath = sdk.parameters.instance.overridenSchemaPath || defaultSchemaPath;
      const schemaName = sdk.parameters.instance.schemaName;

      const editorRef = new JSONEditor(ref.current, { // eslint-disable-line no-undef
        ajax: true,
        ajaxBase: schemaPath,
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
        show_errors: 'never', // interaction | change | always | never
        startval: value,
        template: 'default',
        display_required_only: false,
        show_opt_in: true,
        prompt_before_delete: false,
        object_layout: 'table'
      });

      editorRef.on('ready', () => {
        initializeEditor(editorRef);
      });

      return editorRef;
    };

    sdk.window.startAutoResizer();

    // Handler for external field value changes (e.g. when multiple authors are working on the same entry).
    if (!detachExternalChangeHandler) {
      setDetachExternalChangeHandler(sdk.field.onValueChanged(onExternalChange));
    }

    if (ref && !jsonEditor) {
      setJSONEditor(createEditor());
    }

    return function cleanup() {
      if (detachExternalChangeHandler) detachExternalChangeHandler();

      if (jsonEditor) {
        jsonEditor.destroy();
        setJSONEditor(null);
      }
    };
  }, [detachExternalChangeHandler, jsonEditor, ref, sdk.field, sdk.notifier, sdk.parameters,
    sdk.window, value]);

  return <div ref={ref} />;
}

Extension.propTypes = {
  sdk: PropTypes.object.isRequired
};

export default Extension;
