/** Stand-in for next/image: a plain img with the same props. */
type Props = React.ImgHTMLAttributes<HTMLImageElement> & { src: string; alt: string; priority?: boolean; fill?: boolean; quality?: number };

export default function Image({ priority, fill: _f, quality: _q, ...rest }: Props) {
  return <img loading={priority ? 'eager' : 'lazy'} decoding="async" {...rest} />;
}
