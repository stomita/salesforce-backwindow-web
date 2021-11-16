import React, { MouseEvent, ReactNode } from "react";

/**
 *
 */
type ButtonIconProps = {
  icon: string;
  variant?: "left" | "right" | "small";
};

const ButtonIcon = ({ icon, variant }: ButtonIconProps) => (
  <svg
    className={`slds-button__icon slds-button__icon_${variant}`}
    aria-hidden="true"
  >
    <use
      xlinkHref={`/assets/icons/utility-sprite/svg/symbols.svg#${icon}`}
    ></use>
  </svg>
);

/**
 *
 */
export type ButtonProps = {
  className?: string;
  variant?: string;
  label?: ReactNode;
  title?: string;
  icon?: string;
  disabled?: boolean;
  children?: ReactNode;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
};

/**
 *
 */
export const Button = (props: ButtonProps) => {
  const {
    className,
    variant,
    label,
    title,
    icon,
    disabled,
    children,
    onClick,
  } = props;
  const content = label ?? children;
  return (
    <button
      className={`slds-button ${
        variant ? `slds-button_${variant}` : ""
      } ${className}`}
      disabled={disabled}
      title={title}
      onClick={onClick}
    >
      {icon ? (
        <ButtonIcon icon={icon} variant={content ? "left" : "small"} />
      ) : undefined}
      {content}
      {!content && title ? (
        <span className="slds-assistive-text">{title}</span>
      ) : undefined}
    </button>
  );
};
