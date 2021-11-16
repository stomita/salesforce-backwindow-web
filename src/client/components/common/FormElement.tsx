import React, { ReactNode } from "react";

/**
 *
 */
export type FormElementProps = {
  id?: string;
  label?: string;
	children: ReactNode;
};

/**
 *
 */
export const FormElement = (props: FormElementProps) => {
  const { id, label, children } = props;
  return (
    <div className="slds-form-element">
      <label className="slds-form-element__label" htmlFor={id}>
        {label}
      </label>
      <div className="slds-form-element__control">{children}</div>
    </div>
  );
};
