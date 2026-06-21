interface CategoryCardProps {
  name: string;
  image: string;
  href?: string;
  onClick?: () => void;
}

export default function CategoryCard({ name, image, href = '#', onClick }: CategoryCardProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <a href={href} onClick={handleClick} className="category-card group cursor-pointer">
      <div className="category-image-wrapper">
        <img src={image} alt={name} className="category-image" />
      </div>
      <span className="category-name">{name}</span>
    </a>
  );
}
