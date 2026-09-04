import { useState, type ImgHTMLAttributes } from 'react';

type FadeInImageProps = ImgHTMLAttributes<HTMLImageElement>;

/**
 * Drop-in <img> replacement that fades from 0 to full opacity once the
 * browser actually has pixels to show, instead of the image hard-popping
 * in mid-scroll the instant the network response lands. Opacity is set via
 * inline style (not a Tailwind class) so it never collides with a caller's
 * own transition/transform utility classes (e.g. hover scale effects).
 */
export default function FadeInImage({ style, onLoad, ...props }: FadeInImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <img
      {...props}
      style={{ ...style, opacity: loaded ? 1 : 0, transition: 'opacity 700ms ease-out' }}
      onLoad={(event) => {
        setLoaded(true);
        onLoad?.(event);
      }}
    />
  );
}
