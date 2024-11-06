import * as React from "react"
import { cn } from "../lib/utils.ts"
import { ChevronDown, ChevronUp } from "lucide-react"
import { motion, AnimatePresence, HTMLMotionProps } from "framer-motion"

/**
 * A versatile Card component that can be either static or toggleable.
 * When toggleable, it includes an animation for expanding/collapsing content.
 * 
 * @param toggleable - If true, the card can be expanded/collapsed
 * @param defaultOpen - Initial state of the card when toggleable (default: true)
 */
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { toggleable?: boolean; defaultOpen?: boolean }
>(({ className, toggleable = false, defaultOpen = true, children, ...props }, ref) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  // Separate the header (first child) from the rest of the content
  const header = React.Children.toArray(children)[0];
  const content = React.Children.toArray(children).slice(1);

  return (
    <motion.div
      ref={ref}
      className={cn(
        "rounded-lg border bg-card text-card-foreground shadow-sm",
        className
      ) as any}
      // Scale up slightly on hover when card is collapsed and toggleable
      whileHover={!isOpen && toggleable ? { scale: 1.02 } : {}}
      transition={{ duration: 0.3 }}
      {...(props as HTMLMotionProps<'div'>)}
    >
      {toggleable ? (
        // Animated header section for toggleable cards
        <motion.div
          className="flex justify-between items-center cursor-pointer"
          onClick={() => setIsOpen(!isOpen)}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {header}
          {/* Rotating chevron indicator */}
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.3 }}
            className="p-2"
          >
            <ChevronDown className="h-4 w-4" />
          </motion.div>
        </motion.div>
      ) : (
        header
      )}
      {/* Animated content section with smooth height transition */}
      <AnimatePresence>
        {(!toggleable || isOpen) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
})
Card.displayName = "Card"

/**
 * Container for the card's header section.
 * Typically contains CardTitle and optionally CardDescription.
 */
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1 p-4", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

/**
 * Main title component for the card.
 * Renders as an h3 element with appropriate styling.
 */
const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  >
    {props.children}
  </h3>
))
CardTitle.displayName = "CardTitle"

/**
 * Secondary text component for additional details in the card header.
 * Typically used below the CardTitle.
 */
const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

/**
 * Container for the main content of the card.
 * Provides consistent padding and spacing.
 */
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

/**
 * Optional footer section for the card.
 * Useful for action buttons or additional information.
 */
const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-4 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }