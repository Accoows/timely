interface CategoryCardProps {
  name: string;
  image: string;
  href?: string;
}

export default function CategoryCard({ name, image, href = '#' }: CategoryCardProps) {
  return (
    <a href={href} className="category-card group">
      <div className="category-image-wrapper">
        <img src={image} alt={name} className="category-image" />
      </div>
      <span className="category-name">{name}</span>
    </a>
  );
}
