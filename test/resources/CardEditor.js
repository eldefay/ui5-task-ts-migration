
sap.ui.define([
    "sap/m/Wizard",

    "../editors/ComplexPropertyEditor",
    "../editors/ObjectPropertyEditor",
    "./BindingDefinitionEditor",
    "./ColumnDefinitionEditor",
    "./IntegrationCardDefinitionEditor"

], function(Wizard, ComplexPropertyEditor, ObjectPropertyEditor, BindingDefinitionEditor, ColumnDefinitionEditor, IntegrationCardDefinitionEditor) {
    "use strict";

    /**
     * Creates a new CardEditor.
     *
     * @param {string} allowedNamesPattern for filtering classes by name
     * @param {object} configuration for existing controls
     *
     * @class
     * @classdesc
     *
     * <strong>Note here</strong>
     *
     * @author Samer Aldefai
     * @version ${version}
     * @alias sap.me.cards.CardEditor
     * @extends sap.ui.layout.form.Form
     * @public
     */

    var CardEditor = ObjectPropertyEditor.extend("sap.me.cards.builder.CardEditor", {
        metadata: {
            properties: {
                "modelNames": {type: "string[]", defaultValue: []}
            }
        },
        renderer: ObjectPropertyEditor.getMetadata().getRenderer()
    });

    CardEditor.prototype.init = function() {
        // TODO: Wizzard Template needs refactoring
        // this._sFragmentName = this._sFragmentName || "sap.me.cards.builder.fragment.ObjectEditorWizard";
        ObjectPropertyEditor.prototype.init.apply(this, arguments);

        ComplexPropertyEditor.registerDefaultEditorClassForType("sap.me.cards.BindingDefinition", BindingDefinitionEditor);
        ComplexPropertyEditor.registerDefaultEditorClassForType("sap.me.cards.ColumnDefinition[]", ColumnDefinitionEditor);
        ComplexPropertyEditor.registerDefaultEditorClassForType("sap.me.cards.IntegrationCardDefinition", IntegrationCardDefinitionEditor);
    };

    CardEditor.prototype.setModelNames = function(aModelNames) {
        this.setProperty("modelNames", aModelNames);
        this._oBindingDefinitionEditor?.setModelNames(this.getModelNames());
    };

    CardEditor.prototype.setClass = function(SelectedClass) {
        // TODO: Wizzard
        // var oWizard = this.getEditor().getContent()[0],
        //     oStepsBindingInfo = oWizard.mBindingInfos.steps;
        // oStepsBindingInfo.template = oStepsBindingInfo.template.clone();
        // oWizard.removeAllSteps();

        // this.setEditor(null);
        ObjectPropertyEditor.prototype.setClass.apply(this, arguments);

        // oWizard.bindAggregation("steps", oStepsBindingInfo);

        var sClassName = SelectedClass.getMetadata().getName();

        // TableCard special case
        if (sClassName == "sap.me.cards.TableCard" || sClassName == "sap.me.cards.Table") {

            this._oBindingDefinitionEditor = this.getPropertyEditor("leadingObject");
            this._oColumnDefinitionEditor = this.getPropertyEditor("columnsDefinition");

            this._oBindingDefinitionEditor?.setModelNames(this.getModelNames());
            this._oBindingDefinitionEditor.attachValueChange((oEvent) => {
                this._oColumnDefinitionEditor.setLeadingObject(this._oBindingDefinitionEditor.getValue());
            });

            if (this.getIsNew()) {
                this._oColumnDefinitionEditor.setLeadingObject({});
            }
            this._oColumnDefinitionEditor.setLeadingObject(this._oBindingDefinitionEditor.getValue());
        }

    };

    return CardEditor;
});